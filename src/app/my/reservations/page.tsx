import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReservationList } from "./ReservationList";

export const metadata: Metadata = {
  title: "予約履歴",
};

export default async function MyReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // layout.tsx で認証済みのため user は必ず存在するが、型安全のためチェック
  if (!user) return null;

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date, start_time, end_time, status, total_price, created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return <ReservationList reservations={reservations ?? []} />;
}
