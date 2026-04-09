import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReservationList } from "./ReservationList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "予約履歴",
};

export default async function MyReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date, start_time, end_time, status, total_price, created_at")
    .eq("user_id", user!.id)
    .order("date", { ascending: false });

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8 text-center">
          予約履歴
        </h1>
        <ReservationList reservations={reservations ?? []} />
      </div>
    </div>
  );
}
