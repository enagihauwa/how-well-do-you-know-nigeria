import type { Metadata } from "next";
import { ProfileScreen } from "@/components/account/ProfileScreen";

export const metadata: Metadata = {
  title: "Profile · How Well Do You Know Nigeria?",
};

export default function Page() {
  return <ProfileScreen />;
}
