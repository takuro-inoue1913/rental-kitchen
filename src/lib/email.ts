import "server-only";
import { Resend } from "resend";
import { SITE_NAME, SITE_ADDRESS, CONTACT_EMAIL } from "@/lib/constants";
import { calculateTaxBreakdown } from "@/lib/tax";

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
  companyName?: string | null;
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
    companyName: params.companyName,
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
    companyName,
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

  const tax = calculateTaxBreakdown(totalPrice);

  const text = [
    `${guestName} 様`,
    "",
    `${SITE_NAME} のご予約が確定しました。`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "■ 予約内容",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    ...(companyName ? [`会社名: ${companyName}`] : []),
    `日付: ${formattedDate}`,
    `時間: ${startTime} 〜 ${endTime}`,
    ...(optionLines ? ["", "■ オプション", optionLines] : []),
    "",
    `合計金額: ¥${totalPrice.toLocaleString()}（税込）`,
    `  （税抜 ¥${tax.taxExcludedAmount.toLocaleString()} + 消費税 ¥${tax.taxAmount.toLocaleString()}）`,
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
    SITE_ADDRESS,
    "JR山手線 神田駅 徒歩5分",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `予約ID: ${reservationId}`,
    "",
    `ご不明点がございましたら、お気軽にお問い合わせください。`,
    `お問い合わせ: ${CONTACT_EMAIL}`,
    "",
    `予約一覧: ${siteUrl}/my/reservations`,
    "",
    `このメールは ${SITE_NAME} から自動送信されています。`,
  ].join("\n");

  const subject = `【予約確定】${formattedDate} ${startTime}〜${endTime} - ${SITE_NAME}`;

  return { subject, text };
}

// ── キャンセルメール ──

type CancellationEmailParams = {
  to: string;
  guestName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  refundAmount: number;
  reservationId: string;
  companyName?: string | null;
};

/**
 * 予約キャンセルメールを送信する。
 * 送信失敗時は false を返す（呼び出し元でログ出力）。
 */
export async function sendCancellationEmail(
  params: CancellationEmailParams,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error("sendCancellationEmail: RESEND_API_KEY is not set");
    return false;
  }
  if (!process.env.EMAIL_FROM) {
    console.error("sendCancellationEmail: EMAIL_FROM is not set");
    return false;
  }

  const emailFrom = process.env.EMAIL_FROM;
  const siteUrl = getSiteUrl();
  const { subject, text } = buildCancellationEmail({
    guestName: params.guestName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    totalPrice: params.totalPrice,
    refundAmount: params.refundAmount,
    reservationId: params.reservationId,
    companyName: params.companyName,
    siteUrl,
  });

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom,
      to: params.to,
      subject,
      text,
    });

    if (error) {
      console.error("Resend cancellation email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend cancellation email send failed:", err);
    return false;
  }
}

type BuildCancellationEmailParams = Omit<CancellationEmailParams, "to"> & {
  siteUrl: string;
};

/**
 * キャンセルメールの件名と本文を生成する（テスト可能な純粋関数）。
 */
export function buildCancellationEmail(params: BuildCancellationEmailParams): {
  subject: string;
  text: string;
} {
  const {
    guestName,
    date,
    startTime,
    endTime,
    totalPrice,
    refundAmount,
    reservationId,
    companyName,
    siteUrl,
  } = params;

  const d = new Date(date + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const formattedDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;

  const refundLines =
    refundAmount > 0
      ? [
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "■ 返金について",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `返金額: ¥${refundAmount.toLocaleString()}`,
          "返金はお支払い方法に応じて数日〜数週間で反映されます。",
        ]
      : [];

  const tax = calculateTaxBreakdown(totalPrice);

  const text = [
    `${guestName} 様`,
    "",
    `${SITE_NAME} のご予約がキャンセルされました。`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "■ キャンセルされた予約",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    ...(companyName ? [`会社名: ${companyName}`] : []),
    `日付: ${formattedDate}`,
    `時間: ${startTime} 〜 ${endTime}`,
    `合計金額: ¥${totalPrice.toLocaleString()}（税込）`,
    `  （税抜 ¥${tax.taxExcludedAmount.toLocaleString()} + 消費税 ¥${tax.taxAmount.toLocaleString()}）`,
    ...refundLines,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `予約ID: ${reservationId}`,
    "",
    `ご不明点がございましたら、お気軽にお問い合わせください。`,
    `お問い合わせ: ${CONTACT_EMAIL}`,
    "",
    `予約一覧: ${siteUrl}/my/reservations`,
    "",
    `このメールは ${SITE_NAME} から自動送信されています。`,
  ].join("\n");

  const subject = `【予約キャンセル】${formattedDate} ${startTime}〜${endTime} - ${SITE_NAME}`;

  return { subject, text };
}
