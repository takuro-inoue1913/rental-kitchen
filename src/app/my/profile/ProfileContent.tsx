"use client";

import { useMyPage } from "../_components/MyPageProvider";
import { ProfileForm } from "./ProfileForm";

export function ProfileContent() {
  const { profile, refreshProfile } = useMyPage();

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
