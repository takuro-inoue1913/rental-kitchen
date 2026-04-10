import type { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = {
  title: "プロフィール",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
