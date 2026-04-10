"use client";

import { useEffect } from "react";
import { useMyPage } from "../_components/MyPageProvider";
import { ProfileForm } from "./ProfileForm";

export function ProfileContent() {
  const { profile, profileLoading, fetchProfile, refreshProfile } = useMyPage();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (profileLoading || !profile) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="rounded-xl border border-zinc-200 p-5 space-y-4">
          <div className="h-6 w-32 rounded bg-zinc-200" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
        </div>
      </div>
    );
  }

  return (
    <ProfileForm
      defaultFullName={profile.fullName}
      defaultPhone={profile.phone}
      email={profile.email}
      hasPassword={profile.hasPassword}
      onProfileSaved={refreshProfile}
    />
  );
}
