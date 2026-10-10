import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardScreen } from "@/components/account/LeaderboardScreen";

export const metadata: Metadata = {
  title: "Leaderboards · How Well Do You Know Nigeria?",
};

// The game and sort order are read from the URL with useSearchParams.
export default function Page() {
  return (
    <Suspense>
      <LeaderboardScreen />
    </Suspense>
  );
}
