import type { Metadata } from "next";
import { ProfileSettings } from "@/components/dashboard/profile-settings";

export const metadata: Metadata = { title: "Profile & Settings" };

export default function ProfilePage() {
  return <ProfileSettings />;
}
