import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = {
  title: "プロフィール",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // layout.tsx で認証済みのため user は必ず存在するが、型安全のためチェック
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  // Google OAuth ユーザーはパスワード変更不可
  const hasPassword = user.app_metadata?.providers?.includes("email") ?? false;

  return (
    <ProfileForm
      defaultFullName={profile?.full_name ?? ""}
      defaultPhone={profile?.phone ?? ""}
      email={user.email ?? ""}
      hasPassword={hasPassword}
    />
  );
}
