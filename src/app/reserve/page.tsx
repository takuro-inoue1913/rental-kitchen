import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ReservationFlow } from "./ReservationFlow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "予約",
};

export default async function ReservePage() {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: options }, { data: { user } }] = await Promise.all([
    admin
      .from("options")
      .select("*")
      .eq("is_active", true)
      .order("created_at"),
    supabase.auth.getUser(),
  ]);

  let userInfo: { id: string; email: string; fullName: string; phone?: string | null } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    userInfo = {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? "",
      phone: profile?.phone,
    };
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8 text-center">
          予約
        </h1>
        <ReservationFlow options={options ?? []} user={userInfo} />
      </div>
    </div>
  );
}
