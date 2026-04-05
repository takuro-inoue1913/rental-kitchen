import { createAdminClient } from "@/lib/supabase/admin";
import { ReservationFlow } from "./ReservationFlow";

export const metadata = {
  title: "予約",
};

export default async function ReservePage() {
  const supabase = createAdminClient();

  const { data: options } = await supabase
    .from("options")
    .select("*")
    .eq("is_active", true)
    .order("created_at");

  return (
    <div className="flex flex-col flex-1 bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8 text-center">
          予約
        </h1>
        <ReservationFlow options={options ?? []} />
      </div>
    </div>
  );
}
