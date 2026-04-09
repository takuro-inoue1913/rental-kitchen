import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MyPageNav } from "../_components/MyPageNav";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "プロフィール",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .single();

  // Google OAuth ユーザーはパスワード変更不可
  const hasPassword = user!.app_metadata?.providers?.includes("email") ?? false;

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <MyPageNav />
        <ProfileForm
          defaultFullName={profile?.full_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          email={user!.email ?? ""}
          hasPassword={hasPassword}
        />
      </div>
    </div>
  );
}
