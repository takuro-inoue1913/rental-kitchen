import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceData } from "./invoice-pdf";

/**
 * 予約 ID から領収書 PDF に必要なデータを組み立てる。
 * 予約が存在しない場合や対象外ステータスの場合は null を返す。
 */
export async function buildInvoiceData(
  reservationId: string
): Promise<{ data: InvoiceData } | { error: string; status: number }> {
  const supabase = createAdminClient();

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select(
      "id, date, start_time, end_time, guest_name, billing_type, company_name, company_department, usage_purpose, base_price, total_price, status"
    )
    .eq("id", reservationId)
    .single();

  if (fetchError || !reservation) {
    return { error: "予約が見つかりません", status: 404 };
  }

  if (reservation.status !== "confirmed" && reservation.status !== "completed") {
    return {
      error: "領収書は確定済みまたは完了済みの予約のみ発行できます",
      status: 400,
    };
  }

  // オプション取得
  const { data: reservationOptions } = await supabase
    .from("reservation_options")
    .select("quantity, price_at_booking, option_id")
    .eq("reservation_id", reservationId);

  let options: { name: string; price: number; quantity: number }[] = [];
  if (reservationOptions && reservationOptions.length > 0) {
    const optionIds = reservationOptions.map((ro) => ro.option_id);
    const { data: optionRows } = await supabase
      .from("options")
      .select("id, name")
      .in("id", optionIds);

    const nameMap = new Map((optionRows ?? []).map((o) => [o.id, o.name]));
    options = reservationOptions.map((ro) => ({
      name: nameMap.get(ro.option_id) ?? "オプション",
      price: ro.price_at_booking,
      quantity: ro.quantity,
    }));
  }

  // 発行者情報取得
  const { data: settings } = await supabase
    .from("invoice_settings")
    .select("issuer_name, issuer_address, issuer_registration_number")
    .limit(1)
    .single();

  if (!settings) {
    return { error: "発行者情報が設定されていません", status: 500 };
  }

  return {
    data: {
      reservationId: reservation.id,
      date: reservation.date,
      startTime: reservation.start_time.slice(0, 5),
      endTime: reservation.end_time.slice(0, 5),
      guestName: reservation.guest_name ?? "ゲスト",
      billingType: reservation.billing_type,
      companyName: reservation.company_name,
      companyDepartment: reservation.company_department,
      usagePurpose: reservation.usage_purpose,
      basePrice: reservation.base_price,
      totalPrice: reservation.total_price,
      options,
      issuerName: settings.issuer_name,
      issuerAddress: settings.issuer_address,
      issuerRegistrationNumber: settings.issuer_registration_number,
    },
  };
}
